// controllers/posts.controller.ts
export class PostsController {
  constructor(private service: any) {}

  getPosts = async (req, res) => {
    const { limit, skip } = req.query;
    res.json(await this.service.getAllPosts(Number(limit), Number(skip)));
  };

  createPost = async (req, res) => {
    const { postDescription, postImage } = req.body;
    res.status(201).json(
      await this.service.createPost(req.user.id, postDescription, postImage)
    );
  };

  likePost = async (req, res) => {
    res.json(await this.service.likePost(req.params.id));
  };
}
